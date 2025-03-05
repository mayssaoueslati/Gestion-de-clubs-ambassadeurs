package model;

import enums.Role;

import java.util.Collection;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails{
	
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String prenom;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String adresse;
    
    @Column(unique = true, nullable = false, length = 8)
    private String cin;
    
    @Column(nullable = false)
    private String mission;
    
    @Column(nullable = false)
    private String club;
    
    @Column(nullable = false)
    private String poste;
    
    @Column(nullable = false, length = 15)
    private String tel;
    
    
    @Enumerated(EnumType.STRING)
    private Role role = Role.VISITOR;
    
    @Column(nullable = false)
    private String password;

    
	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return null;
	}

	@Override
	public String getUsername() {
	    return this.email; // or whatever field you want to use as username
	}
	
    
}